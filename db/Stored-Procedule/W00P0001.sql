IF EXISTS (SELECT TOP 1 1 FROM DBO.SYSOBJECTS WITH(NOLOCK) WHERE ID = OBJECT_ID(N'[DBO].[W00P0001]') AND OBJECTPROPERTY(ID, N'IsProcedure') = 1)
DROP PROCEDURE [DBO].[W00P0001]
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO

-- <Summary>
---- Hien thi trang chinh
-- <Param>s
---- 
-- <Return>
---- 
-- <Reference>	
---- 
-- <History>
---- Create on 19/06/2026 by NgocDuy  Hien Thi trang chinh
---EXEC W00P0001 @Mode = 2,  @UnitID = '17.04.00.00.00.00.00'--câu test store


CREATE PROCEDURE W00P0001
(
    @Mode INT,
    @UnitID VARCHAR(50) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Mode 0: Thống kê tổng quan
    IF @Mode = 0
    BEGIN 
        SELECT
            SUM(CASE WHEN StatusID NOT IN ('ST003','ST004') THEN 1 ELSE 0 END) AS TotalSoldier,
            SUM(CASE WHEN StatusID = 'ST005' THEN 1 ELSE 0 END) AS WorkingSoldier,
            SUM(CASE WHEN StatusID ='ST001' THEN 1 ELSE 0 END) AS ActiveSoldier,
            SUM(CASE WHEN StatusID = 'ST004' THEN 1 ELSE 0 END) AS DischargedSoldier,
            SUM(CASE WHEN StatusID = 'ST003' THEN 1 ELSE 0 END) AS RetiredSoldier,
            SUM(CASE WHEN StatusID = 'ST006' THEN 1 ELSE 0 END) AS StudyingSoldier
        FROM Soldier

        RETURN;
    END

    -- Mode 1: Thống kê theo cấp bậc
    IF @Mode = 1
    BEGIN
        SELECT
            R.RankID,
            R.RankName,
            COUNT(*) AS Total
        FROM Soldier S
        INNER JOIN Rank R
            ON S.RankID = R.RankID
        WHERE S.StatusID NOT IN ('ST003', 'ST004')
        GROUP BY
            R.RankID,
            R.RankName
        ORDER BY
            R.RankID;

        RETURN;
    END

    -- Mode 2: Thống kê quân số theo đơn vị con
    IF @Mode = 2
BEGIN

    SELECT
        ParentOU.UnitID,
        ParentOU.UnitName,
        COUNT(S.SoldierID) AS TotalSoldier
    FROM OrganizationUnit ParentOU

        LEFT JOIN OrganizationUnit ChildOU
            ON ChildOU.HierarchyPath LIKE ParentOU.HierarchyPath + '%'

        LEFT JOIN Soldier S
            ON S.UnitID = ChildOU.UnitID
            AND S.StatusID NOT IN ('ST003', 'ST004')

    WHERE ParentOU.ParentUnitID = @UnitID

    GROUP BY
        ParentOU.UnitID,
        ParentOU.UnitName

    ORDER BY
        TotalSoldier DESC

    RETURN
    END
END


GO
SET QUOTED_IDENTIFIER OFF
GO
SET ANSI_NULLS ON
GO

