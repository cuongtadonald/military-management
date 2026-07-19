IF EXISTS (SELECT TOP 1 1 FROM DBO.SYSOBJECTS WITH(NOLOCK) WHERE ID = OBJECT_ID(N'[DBO].[W01P0006]') AND OBJECTPROPERTY(ID, N'IsProcedure') = 1)
DROP PROCEDURE [DBO].[W01P0006]
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO

-- <Summary>
---- Hien thi danh sách thông báo 
-- <Param>s
---- 
-- <Return>
---- 
-- <Reference>	
---- 
-- <ChangeHistory>
---- Create on 11/07/2026 by NgocDuy  Hien thi danh sách thông báo
---EXEC W01P0006 @UserID = 'U002', @ID = 'CH001', @Mode = 0; --câu test store


CREATE PROCEDURE W01P0006
(
    @UserID VARCHAR(50),
    @ID VARCHAR(50),
    @Mode TINYINT
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UnitID VARCHAR(50),
            @HierarchyPath VARCHAR(1000);

    SELECT @UnitID = UnitID
    FROM [User] WITH(NOLOCK)
    WHERE UserID = @UserID;

    IF @UnitID IS NULL
        RETURN;

    SELECT @HierarchyPath = HierarchyPath
    FROM OrganizationUnit WITH(NOLOCK)
    WHERE UnitID = @UnitID;

	IF @Mode = 0
	BEGIN
		--Thông tin chung
		SELECT
			CH.ChangeHistoryID,
			CH.RequestID,
			CH.ChangeDate,
			CH.ChangeType,
			CH.ChangeReason,
			CH.TotalSoldier,
			CH.Description,
			U.FullName AS ChangedByName,
			OU.UnitName
		FROM ChangeHistory CH WITH(NOLOCK)
			INNER JOIN [User] U WITH(NOLOCK)
				ON CH.ChangedBy = U.UserID
			INNER JOIN OrganizationUnit OU WITH(NOLOCK)
				ON U.UnitID = OU.UnitID
		WHERE CH.ChangeHistoryID = @ID

		--Chi tiết thay đổi
		SELECT
			CHD.*,
			S.FullName AS SoldierName,
			S.CitizenID,
			OU2.UnitName,
			R.RankName
		FROM ChangeHistoryDetail CHD WITH(NOLOCK)
			INNER JOIN ChangeHistory CH WITH(NOLOCK)
				ON CHD.ChangeHistoryID = CH.ChangeHistoryID
			INNER JOIN [User] U WITH(NOLOCK)
				ON CH.ChangedBy = U.UserID
			INNER JOIN OrganizationUnit OU WITH(NOLOCK)
				ON U.UnitID = OU.UnitID
			LEFT JOIN Soldier S WITH(NOLOCK)
				ON CHD.SoldierID = S.SoldierID
			LEFT JOIN OrganizationUnit OU2 WITH(NOLOCK)
				ON S.UnitID = OU2.UnitID
			LEFT JOIN Rank R WITH(NOLOCK)
				ON S.RankID = R.RankID
		WHERE CHD.ChangeHistoryID = @ID;
	END
	IF @Mode = 1
	BEGIN
		SELECT
			PR.RequestID,
			PR.Title,
			PR.Content,
			PR.StatusID,
			ST.StatusName,
			PR.RequestDate,
			PR.ApprovedDate,
			PR.ExpiredDate,
			PR.RejectReason,
			PR.Description,
			U1.FullName AS RequestByName,
			U2.FullName AS ApprovedByName,
			OU.UnitName
		FROM PermissionRequest PR WITH(NOLOCK)
			INNER JOIN [User] U1 WITH(NOLOCK)
				ON PR.RequestBy = U1.UserID
			INNER JOIN OrganizationUnit OU WITH(NOLOCK)
				ON U1.UnitID = OU.UnitID
			LEFT JOIN [User] U2 WITH(NOLOCK)
				ON PR.ApprovedBy = U2.UserID
			LEFT JOIN Status ST WITH(NOLOCK)
				ON PR.StatusID = ST.StatusID
		WHERE PR.RequestID = @ID
		  AND OU.HierarchyPath LIKE @HierarchyPath + '%';
	END
END
GO
SET QUOTED_IDENTIFIER OFF
GO
SET ANSI_NULLS ON
GO


